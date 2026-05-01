const PROJECT_ID = "kuma-6c130";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// --- Firestore field value conversion ---

function toField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === "string") {
    // ISO 8601 timestamp pattern
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return { timestampValue: value };
    }
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toField) } };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromField(field) {
  if (!field) return null;
  if ("nullValue" in field) return null;
  if ("booleanValue" in field) return field.booleanValue;
  if ("integerValue" in field) return parseInt(field.integerValue, 10);
  if ("doubleValue" in field) return field.doubleValue;
  if ("stringValue" in field) return field.stringValue;
  if ("timestampValue" in field) return field.timestampValue;
  if ("arrayValue" in field) {
    return (field.arrayValue.values ?? []).map(fromField);
  }
  if ("mapValue" in field) {
    return fromDoc({ fields: field.mapValue.fields ?? {} });
  }
  return null;
}

function fromDoc(doc) {
  if (!doc?.fields) return {};
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = fromField(v);
  }
  return obj;
}

function toDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toField(v);
  }
  return { fields };
}

function authHeader(idToken) {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

async function firestoreRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}/${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Firestore error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function docNameToId(name) {
  return name.split("/").pop();
}

// --- Rules ---
// Path: apps/mahjong/rules/{ruleId}

export async function getRules(idToken) {
  const data = await firestoreRequest(
    "apps/mahjong/rules",
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  if (!data?.documents) return [];
  return data.documents.map(doc => ({
    id: docNameToId(doc.name),
    ...fromDoc(doc),
  }));
}

export async function setRule(rule, idToken) {
  const { id, ...fields } = rule;
  const body = JSON.stringify(toDoc(fields));
  if (id) {
    await firestoreRequest(`apps/mahjong/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  } else {
    await firestoreRequest("apps/mahjong/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  }
}

export async function deleteRule(ruleId, idToken) {
  await firestoreRequest(`apps/mahjong/rules/${ruleId}`, {
    method: "DELETE",
    headers: { ...authHeader(idToken) },
  });
}

// --- Sessions ---
// Path: apps/mahjong/sessions/{sessionId}

export async function getSessions(idToken) {
  const data = await firestoreRequest(
    "apps/mahjong/sessions",
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  if (!data?.documents) return [];
  return data.documents.map(doc => ({
    id: docNameToId(doc.name),
    ...fromDoc(doc),
  }));
}

export async function getSession(sessionId, idToken) {
  const doc = await firestoreRequest(
    `apps/mahjong/sessions/${sessionId}`,
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  return { id: docNameToId(doc.name), ...fromDoc(doc) };
}

export async function setSession(session, idToken) {
  const { id, ...fields } = session;
  const body = JSON.stringify(toDoc(fields));
  if (id) {
    await firestoreRequest(`apps/mahjong/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  } else {
    const doc = await firestoreRequest("apps/mahjong/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
    return docNameToId(doc.name);
  }
}

// --- Games ---
// Path: apps/mahjong/sessions/{sessionId}/games/{gameId}

export async function getGames(sessionId, idToken) {
  const data = await firestoreRequest(
    `apps/mahjong/sessions/${sessionId}/games`,
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  if (!data?.documents) return [];
  return data.documents.map(doc => ({
    id: docNameToId(doc.name),
    ...fromDoc(doc),
  }));
}

export async function setGame(sessionId, game, idToken) {
  const { id, ...fields } = game;
  const body = JSON.stringify(toDoc(fields));
  if (id) {
    await firestoreRequest(`apps/mahjong/sessions/${sessionId}/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  } else {
    await firestoreRequest(`apps/mahjong/sessions/${sessionId}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  }
}

export async function deleteGame(sessionId, gameId, idToken) {
  await firestoreRequest(`apps/mahjong/sessions/${sessionId}/games/${gameId}`, {
    method: "DELETE",
    headers: { ...authHeader(idToken) },
  });
}

// --- Guests ---
// Path: apps/mahjong/guests/{guestId}

export async function getGuests(idToken) {
  const data = await firestoreRequest(
    "apps/mahjong/guests",
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  if (!data?.documents) return [];
  return data.documents.map(doc => ({
    id: docNameToId(doc.name),
    ...fromDoc(doc),
  }));
}

export async function setGuest(guest, idToken) {
  const { id, ...fields } = guest;
  const body = JSON.stringify(toDoc(fields));
  if (id) {
    await firestoreRequest(`apps/mahjong/guests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  } else {
    await firestoreRequest("apps/mahjong/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(idToken) },
      body,
    });
  }
}

// --- Users ---
// Path: apps/mahjong/users/{uid}  ← 麻雀スタッツ（ランキング用）

export async function getUsers(idToken) {
  const data = await firestoreRequest(
    "apps/mahjong/users",
    { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
  );
  if (!data?.documents) return [];
  return data.documents.map(doc => ({
    id: docNameToId(doc.name),
    ...fromDoc(doc),
  }));
}

// kuma-appのusersコレクション（参加者選択用・status==approved）
export async function getKumaMembers(idToken) {
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "status" },
          op: "EQUAL",
          value: { stringValue: "approved" },
        },
      },
    },
  });
  const res = await fetch(`${BASE_URL}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(idToken) },
    body,
  });
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter(r => r.document)
    .map(r => ({
      id: docNameToId(r.document.name),
      ...fromDoc(r.document),
    }));
}

export async function getUser(uid, idToken) {
  try {
    const doc = await firestoreRequest(
      `apps/mahjong/users/${uid}`,
      { headers: { "Content-Type": "application/json", ...authHeader(idToken) } }
    );
    return { id: docNameToId(doc.name), ...fromDoc(doc) };
  } catch {
    return null;
  }
}

export async function setUser(uid, userData, idToken) {
  const maskParams = Object.keys(userData)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const body = JSON.stringify(toDoc(userData));
  await firestoreRequest(`apps/mahjong/users/${uid}?${maskParams}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(idToken) },
    body,
  });
}

export async function updateUserStats(uid, { displayName, finalScore }, idToken) {
  const current = await getUser(uid, idToken) ?? {};
  await setUser(uid, {
    displayName,
    totalPoints: (current.totalPoints ?? 0) + finalScore,
    totalGames: (current.totalGames ?? 0) + 1,
    lastPlayedAt: new Date().toISOString(),
  }, idToken);
}
