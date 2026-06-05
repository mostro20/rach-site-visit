export function requireAuthenticatedUser(request) {
  const principal = getClientPrincipal(request);

  if (!principal && process.env.ENABLE_DEV_AUTH === "true") {
    return {
      userDetails: "local.dev@localhost",
      identityProvider: "local",
      userRoles: ["authenticated"],
    };
  }

  if (!principal) {
    return unauthorized("Authentication is required");
  }

  const roles = principal.userRoles || [];
  if (!roles.includes("authenticated")) {
    return unauthorized("Authenticated role is required");
  }

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const email = (principal.userDetails || "").toLowerCase();
  if (allowedDomains.length && !allowedDomains.some((domain) => email.endsWith(`@${domain}`))) {
    return unauthorized("Signed-in account is outside the allowed domain list");
  }

  return principal;
}

export function getClientPrincipal(request) {
  const encoded = request.headers.get("x-ms-client-principal");
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isAuthError(value) {
  return value?.status === 401;
}

function unauthorized(message) {
  return {
    status: 401,
    jsonBody: { error: message },
  };
}
