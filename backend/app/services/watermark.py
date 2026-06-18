from PIL import Image, ImageDraw, ImageFont
import io
import math


def procesar_imagen(imagen_bytes: bytes) -> tuple[bytes, bytes]:
    """
    Recibe la imagen original y devuelve dos versiones:
    - preview: imagen con marca de agua (800px de ancho máximo, calidad 78)
    - thumbnail: miniatura sin marca de agua (400px de ancho máximo, calidad 70)

    Devuelve una tupla: (preview_bytes, thumbnail_bytes)
    """
    imagen = Image.open(io.BytesIO(imagen_bytes))

    imagen = _corregir_orientacion(imagen)

    thumbnail_bytes = _generar_thumbnail(imagen)

    preview_bytes = _generar_preview(imagen)

    return preview_bytes, thumbnail_bytes


def _corregir_orientacion(imagen: Image.Image) -> Image.Image:
    """
    Los celulares guardan la rotación en los metadatos EXIF.
    Sin esto, muchas fotos aparecen giradas 90 grados.
    """
    try:
        exif = imagen._getexif()
        if exif:
            orientacion = exif.get(274)  
            rotaciones = {3: 180, 6: 270, 8: 90}
            if orientacion in rotaciones:
                imagen = imagen.rotate(rotaciones[orientacion], expand=True)
    except Exception:
        pass  
    return imagen


def _redimensionar(imagen: Image.Image, ancho_max: int) -> Image.Image:
    """
    Redimensiona la imagen manteniendo la proporción.
    """
    ancho, alto = imagen.size
    if ancho <= ancho_max:
        return imagen
    ratio = ancho_max / ancho
    nuevo_alto = int(alto * ratio)
    return imagen.resize((ancho_max, nuevo_alto), Image.LANCZOS)


def _generar_thumbnail(imagen: Image.Image) -> bytes:
    thumb = _redimensionar(imagen.copy(), 400)
    thumb = thumb.convert("RGBA")

    ancho, alto = thumb.size
    capa = Image.new("RGBA", thumb.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(capa)

    tamanio_fuente = max(40, ancho // 8)

    try:
        fuente = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            tamanio_fuente
        )
    except OSError:
        fuente = ImageFont.load_default()

    texto = "Gera_ph"
    bbox = draw.textbbox((0, 0), texto, font=fuente)
    ancho_texto = bbox[2] - bbox[0]
    alto_texto = bbox[3] - bbox[1]

    espaciado_x = ancho_texto + 20
    espaciado_y = alto_texto + 15
    angulo_rad = math.radians(30)

    for x in range(-ancho, ancho * 2, espaciado_x):
        for y in range(-alto, alto * 2, espaciado_y):
            x_rot = int(x * math.cos(angulo_rad) - y * math.sin(angulo_rad))
            y_rot = int(x * math.sin(angulo_rad) + y * math.cos(angulo_rad))
            draw.text(
                (x_rot, y_rot), texto, font=fuente,
                fill=(255, 255, 255, 160),
            )
            draw.text(
                (x_rot + 1, y_rot + 1), texto, font=fuente,
                fill=(0, 0, 0, 120),
            )

    thumb = Image.alpha_composite(thumb, capa).convert("RGB")
    buffer = io.BytesIO()
    thumb.save(buffer, format="JPEG", quality=70, optimize=True)
    buffer.seek(0)
    return buffer.read()


def _generar_preview(imagen: Image.Image) -> bytes:
    """
    Preview de 900px con marca de agua, calidad 80.
    Es lo que ven los jugadores en la galería.
    """
    preview = _redimensionar(imagen.copy(), 900)
    preview = preview.convert("RGBA")

    ancho, alto = preview.size
    capa = Image.new("RGBA", preview.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(capa)

    tamanio_fuente = max(200, ancho // 5)

    try:
        fuente = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            tamanio_fuente
        )
    except OSError:
        fuente = ImageFont.load_default()

    texto = "Gera_ph"
    bbox = draw.textbbox((0, 0), texto, font=fuente)
    ancho_texto = bbox[2] - bbox[0]
    alto_texto = bbox[3] - bbox[1]

    espaciado_x = ancho_texto + 40
    espaciado_y = alto_texto + 30
    angulo_rad = math.radians(30)

    for x in range(-ancho, ancho * 2, espaciado_x):
        for y in range(-alto, alto * 2, espaciado_y):
            x_rot = int(x * math.cos(angulo_rad) - y * math.sin(angulo_rad))
            y_rot = int(x * math.sin(angulo_rad) + y * math.cos(angulo_rad))
            draw.text(
                (x_rot, y_rot), texto, font=fuente,
                fill=(255, 255, 255, 160),
            )
            draw.text(
                (x_rot + 1, y_rot + 1), texto, font=fuente,
                fill=(0, 0, 0, 120),
            )

    preview = Image.alpha_composite(preview, capa).convert("RGB")
    buffer = io.BytesIO()
    preview.save(buffer, format="JPEG", quality=80, optimize=True)
    buffer.seek(0)
    return buffer.read()