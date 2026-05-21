// 임시 DB (JSON 메모리 스토어)
export const prisma = {
  story: {
    data: [] as any[],

    findMany() {
      return Promise.resolve(this.data);
    },

    findFirst() {
      return Promise.resolve(this.data[0] || null);
    },

    create({ data }: any) {
      this.data.push(data);
      return Promise.resolve(data);
    },

    update({ where, data }: any) {
      const i = this.data.findIndex((s: any) => s.id === where.id);
      if (i >= 0) this.data[i] = { ...this.data[i], ...data };
      return Promise.resolve(this.data[i]);
    },

    upsert({ where, create, update }: any) {
      const i = this.data.findIndex((s: any) => s.id === where.id);
      if (i >= 0) {
        this.data[i] = { ...this.data[i], ...update };
        return Promise.resolve(this.data[i]);
      } else {
        const newItem = { ...create };
        this.data.push(newItem);
        return Promise.resolve(newItem);
      }
    },

    deleteMany() {
      this.data = [];
      return Promise.resolve({ count: 0 });
    },

    count() {
      return Promise.resolve(this.data.length);
    },
  },

  dailyKpi: {
    findFirst() { return Promise.resolve(null); },
    findUnique() { return Promise.resolve(null); },
  },

  experiment: {
    findUnique() { return Promise.resolve(null); },
    findMany() { return Promise.resolve([]); },
  },

  settlementItem: {
    findMany() { return Promise.resolve([]); },
  },

  eventLog: {
    data: [] as any[],

    create({ data }: any) {
      const now = new Date();
      const newItem = {
        ...data,
        id: data.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: data.createdAt || now,
      };
      this.data.push(newItem);
      return Promise.resolve(newItem);
    },

    createMany({ data }: any) {
      const now = new Date();
      const newItems = data.map((item: any) => ({
        ...item,
        id: item.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: item.createdAt || now,
      }));
      this.data.push(...newItems);
      return Promise.resolve({ count: data.length });
    },

    findMany({ where, take, orderBy }: any = {}) {
      let result = [...this.data];
      
      // 필터링
      if (where) {
        if (where.eventName) {
          if (where.eventName.in) {
            result = result.filter((e) => where.eventName.in.includes(e.eventName));
          } else {
            result = result.filter((e) => e.eventName === where.eventName);
          }
        }
        if (where.region) {
          result = result.filter((e) => e.region === where.region);
        }
        if (where.createdAt) {
          if (where.createdAt.gte) {
            result = result.filter((e) => {
              const logDate = new Date(e.createdAt);
              const gteDate = new Date(where.createdAt.gte);
              return logDate >= gteDate;
            });
          }
        }
      }

      // 정렬
      if (orderBy) {
        const field = orderBy.createdAt || orderBy.eventName;
        const direction = orderBy.createdAt === "desc" || orderBy.eventName === "desc" ? -1 : 1;
        result.sort((a, b) => {
          const aVal = a[field] || "";
          const bVal = b[field] || "";
          return direction * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
        });
      }

      // 제한
      if (take) {
        result = result.slice(0, take);
      }

      return Promise.resolve(result);
    },

    count({ where }: any = {}) {
      if (!where) {
        return Promise.resolve(this.data.length);
      }
      
      let result = [...this.data];
      if (where.eventName) {
        if (where.eventName.in) {
          result = result.filter((e) => where.eventName.in.includes(e.eventName));
        } else {
          result = result.filter((e) => e.eventName === where.eventName);
        }
      }
      if (where.region) {
        result = result.filter((e) => e.region === where.region);
      }
      
      return Promise.resolve(result.length);
    },
  },

  league: {
    data: [] as any[],

    findMany() {
      return Promise.resolve(this.data);
    },

    findUnique() {
      return Promise.resolve(null);
    },

    create({ data }: any) {
      this.data.push(data);
      return Promise.resolve(data);
    },

    createMany({ data }: any) {
      this.data.push(...data);
      return Promise.resolve({ count: data.length });
    },

    upsert({ where, create, update }: any) {
      const i = this.data.findIndex((l: any) => l.id === where.id);
      if (i >= 0) {
        this.data[i] = { ...this.data[i], ...update };
        return Promise.resolve(this.data[i]);
      } else {
        const newItem = { ...create };
        this.data.push(newItem);
        return Promise.resolve(newItem);
      }
    },

    deleteMany() {
      this.data = [];
      return Promise.resolve({ count: 0 });
    },

    count() {
      return Promise.resolve(this.data.length);
    },
  },

  team: {
    data: [] as any[],
    findMany() { return Promise.resolve(this.data); },
    findUnique() { return Promise.resolve(null); },
    count() { return Promise.resolve(this.data.length); },
    create() { return Promise.resolve(null); },
  },

  teamMember: {
    data: [] as any[],
    findMany() { return Promise.resolve(this.data); },
    count() { return Promise.resolve(this.data.length); },
    create() { return Promise.resolve(null); },
  },

  activityLog: {
    data: [] as any[],

    create({ data }: any) {
      const now = new Date();
      const newItem = {
        ...data,
        id: data.id || `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: data.createdAt || now,
      };
      this.data.push(newItem);
      return Promise.resolve(newItem);
    },

    createMany({ data }: any) {
      const now = new Date();
      const newItems = (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        id: item.id || `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: item.createdAt || now,
      }));
      this.data.push(...newItems);
      console.log(`[PRISMA_MOCK] activityLog.createMany: ${newItems.length}개 추가`);
      return Promise.resolve({ count: newItems.length });
    },

    findMany({ where, take, orderBy }: any = {}) {
      let result = [...this.data];

      // 필터링
      if (where) {
        if (where.event) {
          if (where.event.in) {
            result = result.filter((e) => where.event.in.includes(e.event));
          } else {
            result = result.filter((e) => e.event === where.event);
          }
        }
        if (where.userId) {
          result = result.filter((e) => e.userId === where.userId);
        }
        if (where.createdAt) {
          if (where.createdAt.gte) {
            result = result.filter((e) => {
              const logDate = new Date(e.createdAt);
              const gteDate = new Date(where.createdAt.gte);
              return logDate >= gteDate;
            });
          }
          if (where.createdAt.lt) {
            result = result.filter((e) => {
              const logDate = new Date(e.createdAt);
              const ltDate = new Date(where.createdAt.lt);
              return logDate < ltDate;
            });
          }
        }
      }

      // 정렬
      if (orderBy) {
        const field = orderBy.createdAt || orderBy.event;
        const direction = orderBy.createdAt === "desc" || orderBy.event === "desc" ? -1 : 1;
        result.sort((a, b) => {
          const aVal = a[field] || "";
          const bVal = b[field] || "";
          return direction * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
        });
      }

      // 제한
      if (take) {
        result = result.slice(0, take);
      }

      return Promise.resolve(result);
    },

    count({ where }: any = {}) {
      if (!where) {
        return Promise.resolve(this.data.length);
      }

      let result = [...this.data];
      if (where.event) {
        if (where.event.in) {
          result = result.filter((e) => where.event.in.includes(e.event));
        } else {
          result = result.filter((e) => e.event === where.event);
        }
      }
      if (where.userId) {
        result = result.filter((e) => e.userId === where.userId);
      }

      return Promise.resolve(result.length);
    },
  },

  // Prisma Client 메서드들
  $queryRaw() {
    return Promise.resolve([{ "?column?": 1 }]);
  },

  $disconnect() {
    return Promise.resolve();
  },
};
