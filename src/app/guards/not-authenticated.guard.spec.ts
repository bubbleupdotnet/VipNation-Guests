import { TestBed, async, inject } from "@angular/core/testing";

import { NotAuthenticatedGuard } from "./not-authenticated.guard";

import {} from "jasmine";

describe("NotAuthenticatedGuard", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotAuthenticatedGuard]
    });
  });

  it("should ...", inject(
    [NotAuthenticatedGuard],
    (guard: NotAuthenticatedGuard) => {
      expect(guard).toBeTruthy();
    }
  ));
});
