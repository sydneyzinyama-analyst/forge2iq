package com.forge2iq.handover;

import com.forge2iq.company.Company;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "handover_notes", indexes = {
    @Index(name = "idx_hn_company_id", columnList = "company_id"),
    @Index(name = "idx_hn_shift_date", columnList = "shiftDate")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HandoverNote {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftName fromShift;

    @Column(nullable = false)
    private LocalDate shiftDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "written_by")
    private User writtenBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
