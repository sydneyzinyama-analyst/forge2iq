package com.forge2iq.messaging;

import com.forge2iq.messaging.dto.MessageResponse;
import com.forge2iq.messaging.dto.SendMessageRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public MessageResponse sendMessage(SendMessageRequest req) {
        if (req.content() == null || req.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message content cannot be empty");
        }

        User sender = currentUser();

        User recipient = null;
        if (req.recipientId() != null) {
            recipient = userRepository.findById(req.recipientId())
                .filter(u -> u.getCompany().getId().equals(sender.getCompany().getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Recipient not found in your company"));

            if (recipient.getId().equals(sender.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send a message to yourself");
            }
        }

        Message message = Message.builder()
            .company(sender.getCompany())
            .sender(sender)
            .recipient(recipient)
            .content(req.content().strip())
            .build();

        return MessageResponse.from(messageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getInbox() {
        User user = currentUser();
        return messageRepository
            .findInboxForUser(user.getCompany().getId(), user.getId())
            .stream()
            .map(MessageResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        User user = currentUser();
        return messageRepository.countUnreadForUser(user.getCompany().getId(), user.getId());
    }

    public void markAsRead(Long messageId) {
        User user = currentUser();
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));

        // Only the direct recipient can mark it read; broadcasts are not individually tracked
        if (message.getRecipient() == null
            || !message.getRecipient().getId().equals(user.getId())
            || !message.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        message.setRead(true);
        messageRepository.save(message);
    }
}
