package com.forge2iq.messaging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    // Inbox: direct messages to this user + all broadcasts in the company, newest first
    @Query("""
        SELECT m FROM Message m
        WHERE m.company.id = :companyId
          AND (m.recipient.id = :userId OR m.recipient IS NULL)
        ORDER BY m.createdAt DESC
        """)
    List<Message> findInboxForUser(@Param("companyId") Long companyId,
                                   @Param("userId") Long userId);

    // Unread count: only direct messages the user hasn't opened yet
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.company.id = :companyId
          AND m.recipient.id = :userId
          AND m.read = false
        """)
    long countUnreadForUser(@Param("companyId") Long companyId,
                            @Param("userId") Long userId);
}
