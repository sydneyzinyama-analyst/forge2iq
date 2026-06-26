package com.forge2iq.dashboard;

import com.forge2iq.dashboard.dto.DashboardSummaryResponse;
import com.forge2iq.downtime.Downtime;
import com.forge2iq.downtime.DowntimeRepository;
import com.forge2iq.production.OrderStatus;
import com.forge2iq.production.ProductionOrderRepository;
import com.forge2iq.shift.ShiftReport;
import com.forge2iq.shift.ShiftReportRepository;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductionOrderRepository orderRepository;
    private final ShiftReportRepository shiftReportRepository;
    private final DowntimeRepository downtimeRepository;
    private final UserRepository userRepository;

    public DashboardSummaryResponse getSummary() {
        Long companyId = currentUser().getCompany().getId();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        int totalProduction = orderRepository.sumActualQuantityByCompanyAndDate(companyId, LocalDate.now());
        long activeOrders = orderRepository.countByCompanyIdAndStatus(companyId, OrderStatus.IN_PROGRESS);

        List<Downtime> downtimes = downtimeRepository
            .findByCompanyIdAndStartTimeGreaterThanEqualAndStartTimeLessThan(companyId, startOfDay, endOfDay);
        long totalDowntimeMinutes = downtimes.stream()
            .filter(d -> d.getEndTime() != null)
            .mapToLong(d -> ChronoUnit.MINUTES.between(d.getStartTime(), d.getEndTime()))
            .sum();

        List<ShiftReport> reports = shiftReportRepository.findByCompanyIdAndDateRange(companyId, startOfDay, endOfDay);
        int totalProduced = reports.stream().mapToInt(ShiftReport::getProducedQuantity).sum();
        int totalRejected = reports.stream().mapToInt(ShiftReport::getRejectedQuantity).sum();
        double rejectionRate = totalProduced > 0 ? (double) totalRejected / totalProduced * 100 : 0.0;

        return new DashboardSummaryResponse(totalProduction, totalDowntimeMinutes, activeOrders, rejectionRate);
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
