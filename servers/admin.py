from django.contrib import admin
from .models import Server, ServerMember, ServerRole

admin.site.register(Server)
admin.site.register(ServerRole)
admin.site.register(ServerMember)
