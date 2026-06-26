package com.forge2iq.dispatch;

import com.forge2iq.dispatch.dto.ConfirmDispatchRequest;
import com.forge2iq.dispatch.dto.DispatchEntryResponse;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.ProductType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DispatchEntryService {

    private final DispatchEntryRepository dispatchEntryRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<DispatchEntryResponse> getAll() {
        User user = currentUser();
        return dispatchEntryRepository.findByCompanyIdOrderByDispatchedAtDesc(user.getCompany().getId())
            .stream().map(DispatchEntryResponse::from).toList();
    }

    public List<DispatchEntryResponse> getToday() {
        User user = currentUser();
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        return dispatchEntryRepository.findByCompanyIdAndDispatchedAtAfterOrderByDispatchedAtDesc(user.getCompany().getId(), startOfDay)
            .stream().map(DispatchEntryResponse::from).toList();
    }

    public DispatchEntryResponse confirm(ConfirmDispatchRequest request) {
        if (request.productName() == null || request.productName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        if (request.binsDispatched() == null || request.binsDispatched() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bins dispatched must be positive");

        User user = currentUser();

        ProductType productType = null;
        if (request.productType() != null) {
            try { productType = ProductType.valueOf(request.productType()); } catch (IllegalArgumentException ignored) {}
        }

        DispatchEntry entry = DispatchEntry.builder()
            .company(user.getCompany())
            .productName(request.productName().trim())
            .productType(productType)
            .binsExpected(request.binsExpected() != null ? request.binsExpected() : 0)
            .binsDispatched(request.binsDispatched())
            .destination(request.destination())
            .notes(request.notes())
            .batchNumber(request.batchNumber())
            .dispatchedBy(user)
            .build();

        return DispatchEntryResponse.from(dispatchEntryRepository.save(entry));
    }
}
