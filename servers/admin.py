from django.contrib import admin
from .models import Server, ServerMember

admin.site.register(Server)
admin.site.register(ServerMember)