package com.forge2iq.productionreport;

import com.forge2iq.productionreport.dto.ProductionReportResponse;
import com.forge2iq.productionreport.dto.SubmitReportRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionReportService {

    private final ProductionReportRepository reportRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<ProductionReportResponse> getAll() {
        User user = currentUser();
        return reportRepository.findByCompanyIdOrderByReportDateDescSubmittedAtDesc(user.getCompany().getId())
            .stream().map(ProductionReportResponse::from).toList();
    }

    public ProductionReportResponse submit(SubmitReportRequest req) {
        if (req.reportDate() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report date is required");

        User user = currentUser();

        ProductionReport report = ProductionReport.builder()
            .company(user.getCompany())
            .reportDate(req.reportDate())
            .notes(req.notes())
            .submittedBy(user)
            .build();

        return ProductionReportResponse.from(reportRepository.save(report));
    }

    public ProductionReportResponse markReviewed(Long id) {
        ProductionReport report = reportRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        User user = currentUser();
        report.setStatus(ReportStatus.REVIEWED);
        report.setReviewedBy(user);
        report.setReviewedAt(LocalDateTime.now());

        return ProductionReportResponse.from(reportRepository.save(report));
    }
}
