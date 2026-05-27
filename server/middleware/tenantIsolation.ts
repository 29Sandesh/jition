import { Schema } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { tenantLocalStorage, getTenantId } from "../utils/tenantContext";

import { tenantRequestsMetric } from "../utils/metrics";

// Express middleware to bind the request's organisationId to AsyncLocalStorage
export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerOrgId = req.headers["x-organisation-id"] || req.headers["x-company-id"];
  
  // Resolve organisationId from headers or authenticated user profile
  const orgId = (headerOrgId || (req.user as any)?.organisationId)?.toString();

  if (orgId) {
    // Record Prometheus request metric per tenant ID
    tenantRequestsMetric.inc({ tenant_id: orgId });

    tenantLocalStorage.run(orgId, () => {
      next();
    });
  } else {
    next();
  }
}

// Mongoose plugin to automatically enforce tenant boundaries on all queries
export function tenantIsolationPlugin(schema: Schema) {
  schema.pre(["find", "findOne", "findOneAndUpdate", "updateMany", "updateOne", "deleteMany", "deleteOne", "countDocuments"], async function () {
    const query: any = this;
    const currentFilter = query.getFilter();
    
    const activeTenantId = getTenantId();

    if (!activeTenantId) {
      throw new Error(`Tenant context is missing for database operation on model: ${query.model?.modelName || "unknown"}`);
    }

    if (activeTenantId !== "BYPASS") {
      query.setQuery({ 
        ...currentFilter, 
        organisationId: activeTenantId 
      });
    }

    // Always enforce deletedAt: null by default if not specified
    if (currentFilter.deletedAt === undefined) {
      query.setQuery({ 
        ...query.getFilter(), 
        deletedAt: null 
      });
    }
  });
}
