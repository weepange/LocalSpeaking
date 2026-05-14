import os
import django

from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter

from django.core.asgi import get_asgi_application


os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'config.settings'
)

django.setup()

from messages_app.routing import websocket_urlpatterns


django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": URLRouter(
        websocket_urlpatterns
    ),
})