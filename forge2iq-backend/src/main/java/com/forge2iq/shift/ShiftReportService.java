package com.forge2iq.shift;

import com.forge2iq.shift.dto.CreateShiftReportRequest;
import com.forge2iq.shift.dto.ShiftReportResponse;
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
public class ShiftReportService {

    private final ShiftReportRepository shiftReportRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public List<ShiftReportResponse> getReports() {
        return shiftReportRepository.findByCompanyId(currentUser().getCompany().getId())
            .stream().map(this::toResponse).toList();
    }

    public ShiftReportResponse submitReport(CreateShiftReportRequest request) {
        User user = currentUser();
        ShiftReport report = ShiftReport.builder()
            .shiftName(request.shiftName())
            .producedQuantity(request.producedQuantity())
            .rejectedQuantity(request.rejectedQuantity())
            .comments(request.comments())
            .user(user)
            .company(user.getCompany())
            .build();
        return toResponse(shiftReportRepository.save(report));
    }

    private ShiftReportResponse toResponse(ShiftReport r) {
        return new ShiftReportResponse(r.getId(), r.getShiftName(), r.getProducedQuantity(),
            r.getRejectedQuantity(), r.getComments(), r.getUser().getName(), r.getCreatedAt());
    }
}
