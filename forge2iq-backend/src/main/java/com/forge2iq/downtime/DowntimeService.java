package com.forge2iq.downtime;

import com.forge2iq.downtime.dto.DowntimeResponse;
import com.forge2iq.downtime.dto.LogDowntimeRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DowntimeService {

    private final DowntimeRepository downtimeRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public List<DowntimeResponse> getDowntimes() {
        return downtimeRepository.findByCompanyId(currentUser().getCompany().getId())
            .stream().map(this::toResponse).toList();
    }

    public DowntimeResponse logDowntime(LogDowntimeRequest request) {
        User user = currentUser();
        Downtime downtime = Downtime.builder()
            .machineName(request.machineName())
            .reason(request.reason())
            .startTime(request.startTime())
            .endTime(request.endTime())
            .company(user.getCompany())
            .build();
        return toResponse(downtimeRepository.save(downtime));
    }

    private DowntimeResponse toResponse(Downtime d) {
        return new DowntimeResponse(d.getId(), d.getMachineName(), d.getReason(), d.getStartTime(), d.getEndTime());
    }
}
