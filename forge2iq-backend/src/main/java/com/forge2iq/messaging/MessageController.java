package com.forge2iq.messaging;

import com.forge2iq.messaging.dto.MessageResponse;
import com.forge2iq.messaging.dto.SendMessageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<MessageResponse> send(@RequestBody SendMessageRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.sendMessage(req));
    }

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getInbox() {
        return ResponseEntity.ok(messageService.getInbox());
    }

    @GetMapping("/unread")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", messageService.getUnreadCount()));
    }

    @PatchMapping("/read/{id}")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        messageService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}
