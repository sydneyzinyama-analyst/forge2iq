package com.forge2iq.customerorder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}
