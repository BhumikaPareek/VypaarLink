export type Shop = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};
