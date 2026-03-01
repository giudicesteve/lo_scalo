import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// Order status type matching the database schema
type OrderStatus = "PENDING_PAYMENT" | "COMPLETED" | "DELIVERED" | "CANCELLED";

// GET - Lista ordini (se archived non specificato, restituisce tutti)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get("archived");
    const statusParam = searchParams.get("status");

    const where: {
      isArchived?: boolean;
      status?: OrderStatus;
    } = {};

    // Se archived è specificato, filtra, altrimenti restituisci tutti
    if (archivedParam !== null) {
      where.isArchived = archivedParam === "true";
    }

    if (statusParam) {
      // Validate status is a valid OrderStatus
      const validStatuses: OrderStatus[] = [
        "PENDING_PAYMENT",
        "COMPLETED",
        "DELIVERED",
        "CANCELLED",
      ];
      if (validStatuses.includes(statusParam as OrderStatus)) {
        where.status = statusParam as OrderStatus;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        giftCards: true,
        refunds: {
          select: {
            id: true,
            refundNumber: true,
            totalRefunded: true,
            refundedAt: true,
          },
        },
      },
    });

    // Transform to include product in items (lowercase for frontend compatibility)
    // Use productName (snapshot at purchase time) if available, fallback to current Product name
    const transformedOrders = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: item.Product ? {
          ...item.Product,
          // Override name with snapshot if available
          name: item.productName || item.Product.name,
          nameEn: item.productNameEn || item.Product.nameEn || item.Product.name,
        } : {
          id: item.productId,
          name: item.productName || "Prodotto eliminato",
          nameEn: item.productNameEn || "Prodotto eliminato",
        },
      })),
      hasRefund: order.refunds.length > 0,
      refundCount: order.refunds.length,
      refundedTotal: order.refunds.reduce((sum, r) => sum + r.totalRefunded, 0),
    }));

    return NextResponse.json(transformedOrders);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna ordine (status, archivia)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const data: { status?: OrderStatus; isArchived?: boolean } = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;

    const order = await prisma.order.update({
      where: { id: body.id },
      data,
    });
    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
