package com.forge2iq.audit;

import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class AuditInterceptor implements HandlerInterceptor {

    private final AuditService auditService;
    private final UserRepository userRepository;

    private static final Pattern ID_PATTERN = Pattern.compile("/(\\d+)(/.*)?$");

    private static final Map<String, String> PATH_LABELS = Map.ofEntries(
        Map.entry("work-orders",          "Work Order"),
        Map.entry("shift-entries",        "Shift Entry"),
        Map.entry("dispatch",             "Dispatch"),
        Map.entry("customer-orders",      "Customer Order"),
        Map.entry("printing",             "Printing Batch"),
        Map.entry("printing-shift-logs",  "Printing Stock Log"),
        Map.entry("printing-dispatches",  "Printing Dispatch"),
        Map.entry("sheet-receipts",       "Sheet Receipt"),
        Map.entry("downtime",             "Downtime"),
        Map.entry("production-reports",   "Production Report"),
        Map.entry("products",             "Product"),
        Map.entry("users",                "User"),
        Map.entry("messages",             "Message"),
        Map.entry("shift-reports",        "Shift Report")
    );

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {

        String method = request.getMethod();
        String path   = request.getRequestURI();
        int    status = response.getStatus();

        // Only log writes that succeeded
        if (!isWriteMethod(method) || status < 200 || status >= 300) return;

        // Resolve the current user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return;

        Optional<User> userOpt = userRepository.findByEmail(auth.getName());
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        String action      = resolveAction(method, path);
        String entityType  = resolveEntityType(path);
        Long   entityId    = resolveEntityId(path);
        String description = buildDescription(action, entityType, entityId, path);

        auditService.log(
            user.getCompany().getId(),
            user.getId(),
            user.getName(),
            user.getRole().name(),
            action,
            entityType,
            entityId,
            description
        );
    }

    private boolean isWriteMethod(String method) {
        return "POST".equals(method) || "PUT".equals(method)
            || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private String resolveAction(String method, String path) {
        if (path.contains("/auth/login"))    return "LOGIN";
        if (path.contains("/auth/register")) return "REGISTER";
        return switch (method) {
            case "POST"   -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default       -> method;
        };
    }

    private String resolveEntityType(String path) {
        // Strip leading slash and split
        String[] segments = path.replaceFirst("^/", "").split("/");
        if (segments.length == 0) return "Unknown";
        String base = segments[0];
        return PATH_LABELS.getOrDefault(base, toTitleCase(base));
    }

    private Long resolveEntityId(String path) {
        Matcher m = ID_PATTERN.matcher(path);
        if (m.find()) {
            try { return Long.parseLong(m.group(1)); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private String buildDescription(String action, String entityType, Long entityId, String path) {
        if ("LOGIN".equals(action))    return "User logged in";
        if ("REGISTER".equals(action)) return "Registered new company";

        // Special cases for sub-paths like /printing-dispatches/{id}/confirm
        if (path.endsWith("/confirm")) return "Confirmed " + entityType + (entityId != null ? " #" + entityId : "");
        if (path.endsWith("/review"))  return "Reviewed " + entityType + (entityId != null ? " #" + entityId : "");
        if (path.endsWith("/close"))   return "Closed " + entityType + (entityId != null ? " #" + entityId : "");

        String suffix = entityId != null ? " #" + entityId : "";
        return switch (action) {
            case "CREATE" -> "Created " + entityType;
            case "UPDATE" -> "Updated " + entityType + suffix;
            case "DELETE" -> "Deleted " + entityType + suffix;
            default       -> action + " " + entityType + suffix;
        };
    }

    private String toTitleCase(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).replace("-", " ");
    }
}
