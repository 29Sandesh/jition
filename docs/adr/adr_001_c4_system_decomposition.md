# Architecture Decision Record 001: C4 System Container Decomposition

## Status
Approved

## Context
The The CirCle platform is built from scratch to support high-density real-time collaboration, batch data loading, strict multi-tenant isolation, and background queuing. To prevent the project from devolving into a complex monolithic structure and to allow other developers and hiring managers to quickly understand the codebase flow, we needed a structured way to outline architecture boundaries.

## Decision
We decided to adopt the C4 Model (Context, Container, Component, Code) to document and structure The CirCle. 
Rather than creating multiple independent microservices, we structured The CirCle as a modular monolithic backend with:
1. An Express API serving REST routes.
2. An Apollo GraphQL server resolving batch data lookups parallel to REST.
3. Socket.io servers handling real-time CRDT updates.
These run in a clustered configuration using Redis Sentinel for pub/sub event sharing and state synchronization.

## Consequences
* **Pros:**
  * **Easier Navigation:** Developers can immediately map the system's operational domains.
  * **Scalability:** The websocket state is fully separated from local process memory (via Redis adapter), allowing the backend to scale horizontally behind a load balancer.
  * **Zero-Downtime:** The layout permits deploying the background workers, GraphQL servers, and REST API as separate scaling targets in Kubernetes.
* **Cons:**
  * Requires maintaining clear boundaries in code (e.g. keeping Socket, REST, and GraphQL components separate in the project directory layout).
