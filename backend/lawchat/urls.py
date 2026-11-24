from django.urls import path
from .views import ConversationListCreateView, MessageListCreateView, ChatView
urlpatterns = [path('conversations/', ConversationListCreateView.as_view()), path('conversations/<int:conversation_id>/messages/', MessageListCreateView.as_view()), path('chat/', ChatView.as_view())]
