from django.urls import path

from .views import (
    DirectConversationListCreateView,
    DirectConversationMessageListCreateView,
    MessageListCreateView,
)


urlpatterns = [
    path(
        '',
        MessageListCreateView.as_view()
    ),
    path(
        'direct-conversations/',
        DirectConversationListCreateView.as_view()
    ),
    path(
        'direct-conversations/<int:conversation_id>/messages/',
        DirectConversationMessageListCreateView.as_view()
    ),
]
