from django.urls import re_path
from .consumers import ChatConsumer, DirectMessageConsumer


websocket_urlpatterns = [
    re_path(
        r'ws/chat/(?P<channel_id>\w+)/$',
        ChatConsumer.as_asgi()
    ),
    re_path(
        r'ws/dm/(?P<conversation_id>\w+)/$',
        DirectMessageConsumer.as_asgi()
    ),
]
