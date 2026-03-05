import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/utils/currency";
import { checkAdmin } from "@/lib/api-auth"

// Force dynamic - uses auth()
export const dynamic = 'force-dynamic'

// Order status type matching the database schema
type OrderStatus = "PENDING_PAYMENT" | "COMPLETED" | "DELIVERED" | "CANCELLED";

// GET - Lista ordini con paginazione
export async function GET(req: Request) {
  try {
    // Check admin authentication
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get("archived");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: {
      isArchived?: boolean;
      status?: OrderStatus | { not: OrderStatus };
      OR?: Array<{
        orderNumber?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    // Se archived è specificato, filtra, altrimenti restituisci tutti
    if (archivedParam !== null) {
      const isArchived = archivedParam === "true";
      where.isArchived = isArchived;
      
      // Se stiamo cercando ordini archiviati (tab "Archiviati"), 
      // escludiamo quelli CANCELLED che hanno la loro tab dedicata
      if (isArchived) {
        where.status = { not: "CANCELLED" };
      }
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

    // Ricerca testuale
    if (searchParam) {
      where.OR = [
        { orderNumber: { contains: searchParam, mode: "insensitive" } },
        { email: { contains: searchParam, mode: "insensitive" } },
        { phone: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
    // Convert monetary fields from cents to euro
    const transformedOrders = orders.map((order) => ({
      ...order,
      total: centsToEuro(order.total), // Convert cents to euro
      items: order.items.map((item) => ({
        ...item,
        unitPrice: centsToEuro(item.unitPrice), // Convert cents to euro
        totalPrice: centsToEuro(item.totalPrice), // Convert cents to euro
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
      giftCards: order.giftCards.map((gc) => ({
        ...gc,
        initialValue: centsToEuro(gc.initialValue), // Convert cents to euro
        remainingValue: centsToEuro(gc.remainingValue), // Convert cents to euro
      })),
      refunds: order.refunds.map((refund) => ({
        ...refund,
        totalRefunded: centsToEuro(refund.totalRefunded), // Convert cents to euro
      })),
      hasRefund: order.refunds.length > 0,
      refundCount: order.refunds.length,
      refundedTotal: centsToEuro(order.refunds.reduce((sum, r) => sum + r.totalRefunded, 0)),
    }));

    return NextResponse.json({
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
    // Check admin authentication
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const body = await req.json();
    const data: { status?: OrderStatus; isArchived?: boolean } = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;

    const order = await prisma.order.update({
      where: { id: body.id },
      data,
    });
    
    // Convert monetary fields from cents to euro for response
    return NextResponse.json({
      ...order,
      total: centsToEuro(order.total),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
