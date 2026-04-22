package com.shoestore.repository;

import com.shoestore.entity.ScanHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Active surface is intentionally minimal: insertions via the inherited
 * {@code save(...)}, plus a bulk delete used when an admin removes a
 * product so the FK doesn't block the cascade. Read-side query methods
 * lived here once but had no HTTP endpoint or service caller, so they
 * were removed during the dead-code sweep.
 */
@Repository
public interface ScanHistoryRepository extends JpaRepository<ScanHistory, Long> {

    void deleteByProductId(Long productId);
}
