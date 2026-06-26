package com.forge2iq.workorder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<WorkOrder> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, WorkOrderStatus status);
    List<WorkOrder> findByCustomerOrderId(Long customerOrderId);
    long countByCompanyIdAndBatchNumberStartingWith(Long companyId, String prefix);
}
