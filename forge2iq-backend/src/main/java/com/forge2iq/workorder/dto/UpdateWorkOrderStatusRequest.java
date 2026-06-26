package com.forge2iq.workorder.dto;

import com.forge2iq.workorder.WorkOrderStatus;

public record UpdateWorkOrderStatusRequest(WorkOrderStatus status) {}
