package com.forge2iq.handover;

import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HandoverNoteService {

    private final HandoverNoteRepository handoverNoteRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<HandoverNoteResponse> getAll() {
        User user = currentUser();
        return handoverNoteRepository.findByCompanyIdOrderByCreatedAtDesc(user.getCompany().getId())
            .stream().map(HandoverNoteResponse::from).toList();
    }

    public List<HandoverNoteResponse> getByDate(LocalDate date) {
        User user = currentUser();
        return handoverNoteRepository.findByCompanyIdAndShiftDateOrderByCreatedAtDesc(user.getCompany().getId(), date)
            .stream().map(HandoverNoteResponse::from).toList();
    }

    public HandoverNoteResponse create(String notes, ShiftName fromShift, LocalDate shiftDate) {
        User user = currentUser();
        HandoverNote note = HandoverNote.builder()
            .company(user.getCompany())
            .fromShift(fromShift)
            .shiftDate(shiftDate != null ? shiftDate : LocalDate.now())
            .notes(notes)
            .writtenBy(user)
            .build();
        return HandoverNoteResponse.from(handoverNoteRepository.save(note));
    }
}
