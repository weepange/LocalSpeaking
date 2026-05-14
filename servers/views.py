from rest_framework import generics

from .models import Server
from .serializers import ServerSerializer


class ServerListCreateView(generics.ListCreateAPIView):
    queryset = Server.objects.all()
    serializer_class = ServerSerializer