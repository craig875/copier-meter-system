/** Prisma where fragment: machine has no customer, or customer is not archived. */
export const machineOnActiveCustomerOrUnassigned = {
  OR: [
    { customerId: null },
    { customer: { isArchived: false } },
  ],
};
