package com.shoestore.event;

import com.shoestore.service.StaffSalesSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Projects domain events into reporting tables. Currently only applies
 * per-staff daily sales summaries from {@link SaleCreatedEvent}; other
 * projections can be added here when their consumers are implemented.
 */
@Component
@RequiredArgsConstructor
public class ReportingProjectionListener {

    private final StaffSalesSummaryService staffSalesSummaryService;

    @EventListener
    public void handleSaleCreated(SaleCreatedEvent event) {
        staffSalesSummaryService.applySaleEvent(event);
    }
}
