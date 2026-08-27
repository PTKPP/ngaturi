export interface StoredInvitationMedia {
  id: string;
  storagePath: string;
}

export interface InvitationMediaRepository {
  invitationOwnedBy(ownerId: string, invitationId: string): Promise<boolean>;
  uploadImage(input: { ownerId: string; invitationId: string; file: File; altText: string }): Promise<StoredInvitationMedia>;
  removeImage(ownerId: string, invitationId: string, mediaId: string): Promise<void>;
}
