from django.urls import path

from .views import (
    ServerListCreateView,
    ServerDetailView,
    ServerMemberDetailView,
    ServerMemberListCreateView,
    ServerRoleDetailView,
    ServerRoleListCreateView,
)

urlpatterns = [
    path('', ServerListCreateView.as_view()),
    path('<int:pk>/', ServerDetailView.as_view()),
    path('<int:server_id>/roles/', ServerRoleListCreateView.as_view()),
    path('roles/<int:pk>/', ServerRoleDetailView.as_view()),
    path('<int:server_id>/members/', ServerMemberListCreateView.as_view()),
    path('members/<int:pk>/', ServerMemberDetailView.as_view()),
]
