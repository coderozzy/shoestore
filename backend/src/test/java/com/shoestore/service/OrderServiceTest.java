package com.shoestore.service;

import com.shoestore.dto.CheckoutRequest;
import com.shoestore.dto.CheckoutResponse;
import com.shoestore.entity.CustomerOrder;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductSize;
import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.OrderStatus;
import com.shoestore.enums.StockMovementReason;
import com.shoestore.exception.BadRequestException;
import com.shoestore.repository.CustomerOrderRepository;
import com.shoestore.repository.ProductDiscountRepository;
import com.shoestore.repository.ProductRepository;
import com.shoestore.repository.ProductSizeRepository;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private CustomerOrderRepository customerOrderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductSizeRepository productSizeRepository;
    @Mock
    private ProductDiscountRepository productDiscountRepository;
    @Mock
    private StripeService stripeService;

    private OrderService orderService;
    private TestStockMovementService stockMovementService;

    @BeforeEach
    void setUp() {
        PricingService pricingService = new PricingService(productDiscountRepository);
        stockMovementService = new TestStockMovementService();
        orderService = new OrderService(
                customerOrderRepository,
                productRepository,
                productSizeRepository,
                pricingService,
                stockMovementService,
                stripeService
        );
    }

    @Test
    void shouldReserveStockAndCreatePaymentIntentOnCheckout() {
        CheckoutRequest request = baseRequest(2);

        Product product = Product.builder()
                .id(1L)
                .modelName("Street")
                .color("Black")
                .price(BigDecimal.valueOf(250))
                .build();
        ProductSize productSize = ProductSize.builder()
                .product(product)
                .size(BigDecimal.valueOf(42))
                .stockQuantity(5)
                .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productSizeRepository.findByProductIdAndSizeForUpdate(1L, BigDecimal.valueOf(42)))
                .thenReturn(Optional.of(productSize));
        when(productDiscountRepository.findByProductId(product.getId())).thenReturn(List.of());
        when(customerOrderRepository.save(any(CustomerOrder.class))).thenAnswer(invocation -> {
            CustomerOrder order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(50L);
                order.setCreatedAt(LocalDateTime.of(2026, 2, 5, 12, 0));
            }
            return order;
        });

        PaymentIntent pi = new PaymentIntent();
        pi.setId("pi_test_123");
        pi.setClientSecret("pi_test_123_secret_abc");
        pi.setStatus("requires_payment_method");
        pi.setCurrency("try");
        when(stripeService.createPaymentIntent(anyLong(), any(BigDecimal.class), anyString()))
                .thenReturn(pi);

        CheckoutResponse response = orderService.initiateCheckout(request);

        assertThat(response.getOrderId()).isEqualTo(50L);
        assertThat(response.getClientSecret()).isEqualTo("pi_test_123_secret_abc");
        assertThat(response.getAmount()).isEqualByComparingTo("500");
        assertThat(productSize.getStockQuantity()).isEqualTo(3);
        assertThat(stockMovementService.recorded).hasSize(1);
        assertThat(stockMovementService.recorded.get(0)).isEqualTo("Street:42:2:SALE");
    }

    @Test
    void shouldFailWhenCheckoutQuantityExceedsStock() {
        CheckoutRequest request = baseRequest(10);

        Product product = Product.builder().id(1L).modelName("Street").build();
        ProductSize productSize = ProductSize.builder()
                .product(product)
                .size(BigDecimal.valueOf(42))
                .stockQuantity(2)
                .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productSizeRepository.findByProductIdAndSizeForUpdate(1L, BigDecimal.valueOf(42)))
                .thenReturn(Optional.of(productSize));
        assertThatThrownBy(() -> orderService.initiateCheckout(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    void shouldMarkOrderPaidOnStripeSucceeded() {
        CustomerOrder order = CustomerOrder.builder()
                .id(77L)
                .stripePaymentIntentId("pi_ok")
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.valueOf(100))
                .items(new ArrayList<>())
                .build();

        when(customerOrderRepository.findByStripePaymentIntentId("pi_ok"))
                .thenReturn(Optional.of(order));

        PaymentIntent pi = new PaymentIntent();
        pi.setId("pi_ok");
        pi.setStatus("succeeded");
        when(stripeService.retrievePaymentIntent("pi_ok")).thenReturn(pi);
        when(customerOrderRepository.save(any(CustomerOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.confirmPayment("pi_ok");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaidAt()).isNotNull();
    }

    private CheckoutRequest baseRequest(int quantity) {
        return CheckoutRequest.builder()
                .customerName("Ali")
                .customerPhone("5551112233")
                .customerEmail("ali@example.com")
                .shippingLine1("Cad 1")
                .shippingCity("Istanbul")
                .shippingPostalCode("34000")
                .shippingCountry("TR")
                .items(List.of(CheckoutRequest.Item.builder()
                        .productId(1L)
                        .size(BigDecimal.valueOf(42))
                        .quantity(quantity)
                        .build()))
                .build();
    }

    private static class TestStockMovementService extends StockMovementService {
        private final List<String> recorded = new ArrayList<>();

        TestStockMovementService() {
            super(null, null, null);
        }

        @Override
        public com.shoestore.dto.StockMovementDTO recordSystemMovement(Product product,
                                                                       BigDecimal size,
                                                                       int quantity,
                                                                       MovementDirection direction,
                                                                       StockMovementReason reason,
                                                                       String note) {
            recorded.add(product.getModelName() + ":" + size + ":" + quantity + ":" + reason);
            return null;
        }
    }
}
