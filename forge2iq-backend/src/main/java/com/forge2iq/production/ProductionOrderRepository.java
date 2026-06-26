package com.forge2iq.production;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface ProductionOrderRepository extends JpaRepository<ProductionOrder, Long> {
    List<ProductionOrder> findByCompanyId(Long companyId);
    long countByCompanyIdAndStatus(Long companyId, OrderStatus status);

    @Query("SELECT COALESCE(SUM(po.actualQuantity), 0) FROM ProductionOrder po WHERE po.company.id = :companyId AND po.createdDate = :date")
    int sumActualQuantityByCompanyAndDate(Long companyId, LocalDate date);
}
