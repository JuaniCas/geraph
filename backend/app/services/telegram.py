import httpx
from app.core.config import get_settings

settings = get_settings()


def enviar_notificacion_telegram(mensaje: str) -> None:
    """
    Envía un mensaje al fotógrafo por Telegram.
    Si falla, no rompe el flujo principal (la solicitud
    se crea igual aunque la notificación falle).
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        httpx.post(url, json={
            "chat_id": settings.TELEGRAM_CHAT_ID,
            "text": mensaje,
            "parse_mode": "HTML",
        }, timeout=5.0)
    except Exception as e:
        print(f"Error enviando notificación a Telegram: {e}")