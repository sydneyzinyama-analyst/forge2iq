package com.forge2iq.product;

import com.forge2iq.product.dto.CreateProductRequest;
import com.forge2iq.product.dto.ProductResponse;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAll() {
        User user = currentUser();
        return productRepository.findByCompanyIdOrderByNameAsc(user.getCompany().getId())
            .stream().map(ProductResponse::from).toList();
    }

    public ProductResponse create(CreateProductRequest request) {
        User user = currentUser();
        Product product = Product.builder()
            .company(user.getCompany())
            .name(request.name().trim())
            .productType(request.productType())
            .unitsPerSheet(request.unitsPerSheet())
            .createdBy(user)
            .build();
        return ProductResponse.from(productRepository.save(product));
    }

    public void delete(Long id) {
        User user = currentUser();
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!product.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        productRepository.delete(product);
    }
}
