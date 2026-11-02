import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Manejador global de excepciones para estandarizar las respuestas JSON de error en la API.
    Retorna siempre un formato coherente:
    {
        "status_code": 400/404/500...,
        "error": "NombreDelError",
        "detail": {...} o "Mensaje de error"
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            "status_code": response.status_code,
            "error": exc.__class__.__name__,
            "detail": response.data,
        }
        response.data = custom_data
        return response

    # Para excepciones no controladas por DRF (errores 500)
    logger.exception("Error no manejado en la aplicación: %s", exc)
    return Response(
        {
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "error": "InternalServerError",
            "detail": "Ha ocurrido un error inesperado en el servidor.",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )

