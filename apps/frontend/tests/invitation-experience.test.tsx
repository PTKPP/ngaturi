import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationExperienceShell, useInvitationExperience, type ResolvedInvitationMusic } from "@/templates/shared/InvitationExperienceShell";
import { InvitationOpenButton } from "@/templates/shared/InvitationOpenButton";

const music: ResolvedInvitationMusic = {
  trackId: "ambient-soft",
  mediaId: "",
  title: "Ambient lembut",
  source: "/invitation-music/ambient-soft.wav",
  startAtSeconds: 0,
  volume: 0.35,
  loop: true,
};

function TestInvitation({ configured = true, label = "Isi" }: { configured?: boolean; label?: string }) {
  return <InvitationExperienceShell music={configured ? music : null} preview={false}><TestInvitationContent label={label} /></InvitationExperienceShell>;
}

function TestInvitationContent({ label }: { label: string }) {
  const { opened } = useInvitationExperience();
  return <><InvitationOpenButton>Buka Undangan</InvitationOpenButton><p data-testid="opened">{opened ? "open" : "closed"}</p><p>{label}</p></>;
}

describe("shared invitation opening and music lifecycle", () => {
  const play = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("play")); return Promise.resolve(); });
  const pause = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("pause")); });

  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
    play.mockClear();
    pause.mockClear();
  });

  it("starts configured music from the opening interaction and exposes pause/resume", async () => {
    render(<TestInvitation />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("opened")).toHaveTextContent("open");
    fireEvent.click(screen.getByRole("button", { name: "Jeda musik" }));
    expect(pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Putar musik" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  });

  it("opens normally without rendering audio or controls when no track is configured", () => {
    const view = render(<TestInvitation configured={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    expect(screen.getByTestId("opened")).toHaveTextContent("open");
    expect(view.container.querySelector("audio")).toBeNull();
    expect(screen.queryByRole("button", { name: /musik/i })).not.toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });

  it("keeps the invitation open when playback is rejected", async () => {
    play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    render(<TestInvitation />);
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("opened")).toHaveTextContent("open");
    expect(screen.getByRole("button", { name: "Putar musik" })).toBeInTheDocument();
  });

  it("does not restart music during an ordinary child rerender", async () => {
    const view = render(<TestInvitation label="Pertama" />);
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    view.rerender(<TestInvitation label="Kedua" />);
    expect(screen.getByText("Kedua")).toBeInTheDocument();
    expect(play).toHaveBeenCalledTimes(1);
    expect(view.container.querySelectorAll("audio")).toHaveLength(1);
  });

  it("does not autoplay in preview but allows an explicit play action", async () => {
    render(<InvitationExperienceShell music={music} preview><InvitationOpenButton>Buka Undangan</InvitationOpenButton></InvitationExperienceShell>);
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Putar musik" }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });
});
