export const rearCameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getErrorKind(error: unknown) {
  const details = error as { name?: string; kind?: string };
  return details.kind ?? details.name ?? "";
}

function isPermissionOrSecurityError(error: unknown) {
  const kind = getErrorKind(error);
  return kind === "NotAllowedError" || kind === "permission-denied" || kind === "SecurityError";
}

export function requestCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject({ kind: "no-api" });
  }

  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  return getUserMedia(rearCameraConstraints).catch((error: unknown) => {
    if (isPermissionOrSecurityError(error)) {
      throw error;
    }

    return getUserMedia({ audio: false, video: true }).catch((fallbackError: unknown) => {
      throw fallbackError;
    });
  });
}

export function getCameraErrorMessage(error: unknown) {
  const kind = getErrorKind(error);

  if (kind === "no-api") {
    return "Caméra non compatible avec ce navigateur.";
  }

  if (kind === "NotAllowedError" || kind === "permission-denied" || kind === "SecurityError") {
    return "Accès caméra refusé. Autorisez la caméra dans le navigateur puis réessayez.";
  }

  if (kind === "NotFoundError" || kind === "no-camera") {
    return "Aucune caméra détectée sur cet appareil.";
  }

  if (kind === "NotReadableError" || kind === "in-use") {
    return "La caméra est déjà utilisée par une autre application.";
  }

  if (kind === "OverconstrainedError" || kind === "overconstrained") {
    return "La caméra arrière n'est pas disponible. Fermez les autres applications caméra puis réessayez.";
  }

  if (kind === "insecure-context" || !window.isSecureContext) {
    return "La caméra nécessite une page sécurisée HTTPS.";
  }

  return "Caméra indisponible dans l'aperçu. Ouvrez l'application en plein écran puis réessayez.";
}

export function openCurrentPageFullscreen() {
  const opened = window.open(window.location.href, "_blank", "noopener,noreferrer");
  opened?.focus();
  return Boolean(opened);
}