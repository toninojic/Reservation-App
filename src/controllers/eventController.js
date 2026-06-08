const { getDb } = require("../db/database");
const { deleteUploadedFile, fileToPublicPath } = require("../utils/uploads");
const { isPlainObject, normalizeText, parsePositiveInteger } = require("../utils/validation");

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

function currentCalendarBounds() {
  const currentYear = new Date().getFullYear();
  return {
    min: `${currentYear - 1}-01-01`,
    max: `${currentYear + 2}-12-31`
  };
}

function isValidDateString(value) {
  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isDateInAllowedRange(value) {
  const bounds = currentCalendarBounds();
  return value >= bounds.min && value <= bounds.max;
}

function isValidTime(value) {
  if (!timePattern.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function readEventPayload(body) {
  return {
    event_date: String(body.event_date || "").trim(),
    event_name: normalizeText(body.event_name, 160),
    start_time: String(body.start_time || "").trim(),
    end_time: String(body.end_time || "").trim(),
    location: normalizeText(body.location, 160),
    contact_person: normalizeText(body.contact_person, 120) || null,
    phone: String(body.phone || "").trim() || null,
    description: normalizeText(body.description, 2000) || null
  };
}

function validateEventPayload(payload) {
  if (
    !payload.event_date ||
    !payload.event_name ||
    !payload.start_time ||
    !payload.end_time ||
    !payload.location
  ) {
    return "Datum, naziv događaja, vreme početka, vreme završetka i lokacija su obavezni.";
  }

  if (!isValidDateString(payload.event_date)) {
    return "Datum nije ispravan.";
  }

  if (!isDateInAllowedRange(payload.event_date)) {
    return "Datum nije u dozvoljenom opsegu kalendara.";
  }

  if (!isValidTime(payload.start_time) || !isValidTime(payload.end_time)) {
    return "Vreme mora biti u formatu HH:MM.";
  }

  if (payload.end_time <= payload.start_time) {
    return "Vreme završetka mora biti nakon vremena početka.";
  }

  if (payload.event_name.length > 160 || payload.location.length > 160) {
    return "Naziv događaja i lokacija mogu imati najviše 160 karaktera.";
  }

  if (payload.contact_person && payload.contact_person.length > 120) {
    return "Kontakt osoba može imati najviše 120 karaktera.";
  }

  if (payload.phone && !/^[0-9+()\-\s/]{3,40}$/.test(payload.phone)) {
    return "Telefon nije u ispravnom formatu.";
  }

  if (payload.description && payload.description.length > 2000) {
    return "Opis može imati najviše 2000 karaktera.";
  }

  return null;
}

function eventSelectSql() {
  return `
    SELECT
      events.*,
      users.organization_name,
      users.logo_path AS organization_logo_path,
      users.logo_path
    FROM events
    JOIN users ON users.id = events.user_id
  `;
}

function listEvents(req, res) {
  const bounds = currentCalendarBounds();
  if ((req.query.from && !isValidDateString(req.query.from)) || (req.query.to && !isValidDateString(req.query.to))) {
    return res.status(400).json({ message: "Opseg datuma nije ispravan." });
  }

  const from = req.query.from || bounds.min;
  const to = req.query.to || bounds.max;

  if (from > to) {
    return res.status(400).json({ message: "Opseg datuma nije ispravan." });
  }

  const events = getDb()
    .prepare(
      `${eventSelectSql()}
       WHERE events.event_date BETWEEN ? AND ?
       ORDER BY events.event_date ASC, events.start_time ASC`
    )
    .all(from, to);

  return res.json({ events, bounds });
}

function listAllEvents(req, res) {
  const events = getDb()
    .prepare(
      `${eventSelectSql()}
       ORDER BY events.event_date ASC, events.start_time ASC`
    )
    .all();

  return res.json({ events, bounds: currentCalendarBounds() });
}

function getEvent(req, res) {
  const id = parsePositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID događaja nije ispravan." });
  }

  const event = getDb()
    .prepare(`${eventSelectSql()} WHERE events.id = ?`)
    .get(id);

  if (!event) {
    return res.status(404).json({ message: "Događaj nije pronađen." });
  }

  return res.json({ event });
}

function createEvent(req, res) {
  if (!isPlainObject(req.body)) {
    deleteUploadedFile(fileToPublicPath(req.file));
    return res.status(400).json({ message: "Zahtev nije ispravan." });
  }

  const payload = readEventPayload(req.body);
  const flyerPath = fileToPublicPath(req.file);
  const validationError = validateEventPayload(payload);

  if (validationError) {
    deleteUploadedFile(flyerPath);
    return res.status(400).json({ message: validationError });
  }

  try {
    const result = getDb()
      .prepare(
        `INSERT INTO events (
          user_id, event_date, event_name, start_time, end_time, location,
          contact_person, phone, description, flyer_path
        ) VALUES (
          @user_id, @event_date, @event_name, @start_time, @end_time, @location,
          @contact_person, @phone, @description, @flyer_path
        )`
      )
      .run({
        ...payload,
        user_id: req.user.id,
        flyer_path: flyerPath
      });

    const event = getDb()
      .prepare(`${eventSelectSql()} WHERE events.id = ?`)
      .get(result.lastInsertRowid);

    return res.status(201).json({ event, message: "Datum je uspešno rezervisan." });
  } catch (err) {
    deleteUploadedFile(flyerPath);
    throw err;
  }
}

function canManageEvent(user, event) {
  return user.role === "admin" || event.user_id === user.id;
}

function updateEvent(req, res) {
  const database = getDb();
  const id = parsePositiveInteger(req.params.id);
  const newFlyerPath = fileToPublicPath(req.file);

  if (!id) {
    deleteUploadedFile(newFlyerPath);
    return res.status(400).json({ message: "ID događaja nije ispravan." });
  }

  if (!isPlainObject(req.body)) {
    deleteUploadedFile(newFlyerPath);
    return res.status(400).json({ message: "Zahtev nije ispravan." });
  }

  const existing = database.prepare("SELECT id, user_id, flyer_path FROM events WHERE id = ?").get(id);

  if (!existing) {
    deleteUploadedFile(newFlyerPath);
    return res.status(404).json({ message: "Događaj nije pronađen." });
  }

  if (!canManageEvent(req.user, existing)) {
    deleteUploadedFile(newFlyerPath);
    return res.status(403).json({ message: "Možete menjati samo svoje događaje." });
  }

  const payload = readEventPayload(req.body);
  const validationError = validateEventPayload(payload);

  if (validationError) {
    deleteUploadedFile(newFlyerPath);
    return res.status(400).json({ message: validationError });
  }

  const shouldRemoveFlyer = String(req.body.remove_flyer || "false") === "true";
  const flyerPath = newFlyerPath || (shouldRemoveFlyer ? null : existing.flyer_path);

  try {
    database
      .prepare(
        `UPDATE events
         SET event_date = @event_date,
             event_name = @event_name,
             start_time = @start_time,
             end_time = @end_time,
             location = @location,
             contact_person = @contact_person,
             phone = @phone,
             description = @description,
             flyer_path = @flyer_path,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`
      )
      .run({ ...payload, flyer_path: flyerPath, id });

    if (newFlyerPath || shouldRemoveFlyer) {
      deleteUploadedFile(existing.flyer_path);
    }

    const event = database.prepare(`${eventSelectSql()} WHERE events.id = ?`).get(id);
    return res.json({ event, message: "Događaj je uspešno izmenjen." });
  } catch (err) {
    deleteUploadedFile(newFlyerPath);
    throw err;
  }
}

function deleteEvent(req, res) {
  const database = getDb();
  const id = parsePositiveInteger(req.params.id);

  if (!id) {
    return res.status(400).json({ message: "ID događaja nije ispravan." });
  }

  const existing = database.prepare("SELECT id, user_id, flyer_path FROM events WHERE id = ?").get(id);

  if (!existing) {
    return res.status(404).json({ message: "Događaj nije pronađen." });
  }

  if (!canManageEvent(req.user, existing)) {
    return res.status(403).json({ message: "Možete obrisati samo svoje događaje." });
  }

  database.prepare("DELETE FROM events WHERE id = ?").run(id);
  deleteUploadedFile(existing.flyer_path);

  return res.json({ message: "Događaj je obrisan." });
}

module.exports = {
  currentCalendarBounds,
  createEvent,
  deleteEvent,
  getEvent,
  listAllEvents,
  listEvents,
  updateEvent
};
