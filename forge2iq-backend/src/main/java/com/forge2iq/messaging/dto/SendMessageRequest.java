package com.forge2iq.messaging.dto;

public record SendMessageRequest(
    Long recipientId,  // null → broadcast to whole company
    String content
) {}
