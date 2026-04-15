package com.shoestore.service;

import com.shoestore.dto.StaffSalesSummaryDTO;
import com.shoestore.entity.StaffSalesDailySummary;
import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import com.shoestore.event.SaleCreatedEvent;
import com.shoestore.repository.StaffSalesDailySummaryRepository;
import com.shoestore.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffSalesSummaryServiceTest {

    @Mock
    private StaffSalesDailySummaryRepository summaryRepository;
    @Mock
    private UserRepository userRepository;

    private StaffSalesSummaryService service;

    @BeforeEach
    void setUp() {
        service = new StaffSalesSummaryService(summaryRepository, userRepository);
    }

    @Test
    void shouldCreateNewSummaryFromSaleEvent() {
        User user = User.builder().id(11L).username("staff").role(Role.STAFF).build();
        SaleCreatedEvent event = SaleCreatedEvent.builder()
                .saleId(5L)
                .userId(11L)
                .quantity(3)
                .totalAmount(BigDecimal.valueOf(750))
                .occurredAt(LocalDateTime.of(2026, 2, 5, 10, 0))
                .build();

        when(summaryRepository.findByUserIdAndSummaryDate(11L, LocalDate.of(2026, 2, 5))).thenReturn(Optional.empty());
        when(userRepository.findById(11L)).thenReturn(Optional.of(user));

        service.applySaleEvent(event);

        verify(summaryRepository).save(any(StaffSalesDailySummary.class));
    }

    @Test
    void shouldReturnSummaryDtosForDateRange() {
        User user = User.builder().id(11L).username("staff").role(Role.STAFF).build();
        StaffSalesDailySummary summary = StaffSalesDailySummary.builder()
                .user(user)
                .summaryDate(LocalDate.of(2026, 2, 5))
                .totalQuantity(4)
                .totalRevenue(BigDecimal.valueOf(1000))
                .build();

        when(summaryRepository.findBySummaryDateBetweenOrderBySummaryDateDesc(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 10)))
                .thenReturn(List.of(summary));

        List<StaffSalesSummaryDTO> result = service.getSummaries(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 10));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUsername()).isEqualTo("staff");
        assertThat(result.get(0).getTotalRevenue()).isEqualByComparingTo("1000");
    }
}
