package com.forge2iq.messaging.dto;

import com.forge2iq.messaging.Message;

import java.time.LocalDateTime;

public record MessageResponse(
    Long id,
    Long senderId,
    String senderName,
    Long recipientId,
    String recipientName,
    String content,
    LocalDateTime createdAt,
    boolean read,
    boolean broadcast
) {
    public static MessageResponse from(Message m) {
        boolean isBroadcast = m.getRecipient() == null;
        return new MessageResponse(
            m.getId(),
            m.getSender().getId(),
            m.getSender().getName(),
            isBroadcast ? null : m.getRecipient().getId(),
            isBroadcast ? null : m.getRecipient().getName(),
            m.getContent(),
            m.getCreatedAt(),
            m.isRead(),
            isBroadcast
        );
    }
}
