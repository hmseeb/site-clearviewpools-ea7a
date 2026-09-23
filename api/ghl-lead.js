/* ===========================================================
   ClearviewPools — GoHighLevel lead intake
   Receives website form submissions and creates/updates the
   contact in the GoHighLevel sub-account.

   Sub-account (location) ID: EN13UMkgSVAXA64BWjQq

   Required environment variable (set in the hosting project):
     GHL_API_KEY  — Private Integration token / access token for
                    the sub-account above. Scopes needed:
                    contacts.write, contacts.readonly,
                    locations/customFields.readonly, notes (optional)
   =========================================================== */

'use strict';

var LOCATION_ID = 'EN13UMkgSVAXA64BWjQq';
var API_BASE = 'https://services.leadconnectorhq.com';
var API_VERSION = '2021-07-28';

var LEAD_SOURCE_FIELD = 'Lead Source';
var WEBSITE_FORM_FIELD = 'Website Form';
var MESSAGE_FIELD_NAMES = ['Message', 'Form Message', 'Lead Message'];

var TAG = 'website-lead';

/* Cached custom-field lookup (warm lambda reuse) */
var customFieldCache = null;

function token() {
  return (
    process.env.GHL_API_KEY ||
    process.env.GHL_ACCESS_TOKEN ||
    process.env.GHL_LOCATION_API_KEY ||
    process.env.HIGHLEVEL_API_KEY ||
    ''
  );
}

function headers() {
  return {
    Authorization: 'Bearer ' + token(),
    Version: API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slug(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === 'object') { return resolve(req.body); }
    if (typeof req.body === 'string' && req.body) {
      try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
    }
    var raw = '';
    req.on('data', function (chunk) { raw += chunk; });
    req.on('end', function () {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', function () { resolve({}); });
  });
}

/* Look up the sub-account's contact custom fields so we can address
   "Lead Source" / "Website Form" by id (falls back to a key guess). */
async function loadCustomFields() {
  if (customFieldCache) { return customFieldCache; }
  try {
    var res = await fetch(
      API_BASE + '/locations/' + LOCATION_ID + '/customFields?model=contact',
      { method: 'GET', headers: headers() }
    );
    if (!res.ok) { return (customFieldCache = []); }
    var data = await res.json();
    customFieldCache = (data && (data.customFields || data.customField)) || [];
  } catch (e) {
    customFieldCache = [];
  }
  return customFieldCache;
}

function findField(fields, names) {
  var wanted = (Array.isArray(names) ? names : [names]).map(function (n) {
    return n.toLowerCase();
  });
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i] || {};
    var name = str(f.name).toLowerCase();
    var key = str(f.fieldKey).toLowerCase();
    for (var j = 0; j < wanted.length; j++) {
      var w = wanted[j];
      if (name === w || key === 'contact.' + slug(w) || key === slug(w)) { return f; }
    }
  }
  return null;
}

function customFieldEntry(fields, names, value) {
  if (!value) { return null; }
  var match = findField(fields, names);
  if (match && match.id) { return { id: match.id, field_value: value }; }
  var fallbackName = Array.isArray(names) ? names[0] : names;
  return { key: slug(fallbackName), field_value: value };
}

async function addNote(contactId, message) {
  if (!contactId || !message) { return; }
  try {
    await fetch(API_BASE + '/contacts/' + contactId + '/notes', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ body: message })
    });
  } catch (e) {
    /* Notes are a nice-to-have; never fail the submission over them. */
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  var body = await readBody(req);

  /* Honeypot — silently accept and drop obvious bots. */
  if (str(body.company)) { return res.status(200).json({ ok: true }); }

  var firstName = str(body.firstName);
  var lastName = str(body.lastName);
  var email = str(body.email);
  var phone = str(body.phone);
  var message = str(body.message);
  var formName = str(body.formName) || 'Website Form';

  if (!firstName && !lastName) {
    return res.status(400).json({ ok: false, error: 'Please include your name.' });
  }
  if (!email && !phone) {
    return res.status(400).json({ ok: false, error: 'Please include an email address or phone number.' });
  }

  if (!token()) {
    return res.status(500).json({
      ok: false,
      error: 'Lead routing is not configured yet. Please call us and we will take your details by phone.'
    });
  }

  /* Extra detail the site collects gets folded into the message body so
     nothing the visitor typed is lost. */
  var extras = [];
  if (str(body.service)) { extras.push('Service needed: ' + str(body.service)); }
  if (str(body.address)) { extras.push('Property address / area: ' + str(body.address)); }
  var fullMessage = extras.concat(message ? [message] : []).join('\n');

  var fields = await loadCustomFields();
  var customFields = [
    customFieldEntry(fields, LEAD_SOURCE_FIELD, 'Website'),
    customFieldEntry(fields, WEBSITE_FORM_FIELD, formName)
  ];
  var messageField = findField(fields, MESSAGE_FIELD_NAMES);
  if (messageField && messageField.id && fullMessage) {
    customFields.push({ id: messageField.id, field_value: fullMessage });
  }
  customFields = customFields.filter(Boolean);

  var payload = {
    locationId: LOCATION_ID,
    firstName: firstName,
    lastName: lastName,
    name: (firstName + ' ' + lastName).trim(),
    source: 'Website',
    tags: [TAG],
    customFields: customFields
  };
  if (email) { payload.email = email; }
  if (phone) { payload.phone = phone; }

  try {
    var upsert = await fetch(API_BASE + '/contacts/upsert', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    });

    var result = null;
    try { result = await upsert.json(); } catch (e) { result = null; }

    if (!upsert.ok) {
      var detail = (result && (result.message || result.error)) || ('HTTP ' + upsert.status);
      console.error('GHL upsert failed:', detail);
      return res.status(502).json({
        ok: false,
        error: 'We could not send your request just now. Please call us and we will take your details by phone.'
      });
    }

    var contact = (result && (result.contact || result)) || {};
    var contactId = contact.id || contact.contactId || null;

    await addNote(contactId, fullMessage);

    return res.status(200).json({ ok: true, contactId: contactId });
  } catch (err) {
    console.error('GHL request error:', err && err.message);
    return res.status(502).json({
      ok: false,
      error: 'We could not send your request just now. Please call us and we will take your details by phone.'
    });
  }
};
