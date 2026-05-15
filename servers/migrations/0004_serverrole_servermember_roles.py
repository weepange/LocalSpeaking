from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('servers', '0003_alter_servermember_server'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServerRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('color', models.CharField(default='#5865f2', max_length=7)),
                ('position', models.PositiveIntegerField(default=0)),
                ('can_view_server', models.BooleanField(default=True)),
                ('can_manage_channels', models.BooleanField(default=False)),
                ('can_manage_roles', models.BooleanField(default=False)),
                ('can_send_messages', models.BooleanField(default=True)),
                ('is_default', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('server', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roles', to='servers.server')),
            ],
            options={
                'ordering': ['position', 'id'],
                'unique_together': {('server', 'name')},
            },
        ),
        migrations.AddField(
            model_name='servermember',
            name='roles',
            field=models.ManyToManyField(blank=True, related_name='members', to='servers.serverrole'),
        ),
    ]
