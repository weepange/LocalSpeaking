from django.urls import path
from .views import ServerListCreateView

urlpatterns = [
    path('', ServerListCreateView.as_view()),
]