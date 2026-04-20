import { makeAutoObservable } from 'mobx';

export class UiStore {
  drawerOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  toggleDrawer = (): void => {
    this.drawerOpen = !this.drawerOpen;
  };

  openDrawer = (): void => {
    this.drawerOpen = true;
  };

  closeDrawer = (): void => {
    this.drawerOpen = false;
  };
}
