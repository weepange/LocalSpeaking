from django.urls import path

from .views import ChannelListCreateView


urlpatterns = [
    path(
        '',
        ChannelListCreateView.as_view()
    ),
]