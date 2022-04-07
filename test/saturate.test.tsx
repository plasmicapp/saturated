import React from 'react';
import { saturate } from '../src';

describe('saturated', () => {
  const handler = () => alert('hi');
  it('works with basic html', () => {
    expect(saturate(<div>Hello world!</div>, {})).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{
          __html: `Hello world!`,
        }}
      />
    );
    expect(
      saturate(
        <div>
          Hello <em>dear</em> world!
        </div>,
        {}
      )
    ).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{
          __html: `Hello <em>dear</em> world!`,
        }}
      />
    );
    expect(
      saturate(
        <div>
          <p>
            Hello <em>dear</em> world!
          </p>
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        </div>,
        {}
      )
    ).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{
          __html: `<p>Hello <em>dear</em> world!</p><ul><li>One</li><li>Two</li></ul>`,
        }}
      />
    );

    expect(
      saturate(
        <div className="yup" onClick={handler}>
          <p>
            Hello <em>dear</em> world!
          </p>
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        </div>,
        {}
      )
    ).toEqual(
      <div
        data-saturated={true}
        className="yup"
        onClick={handler}
        dangerouslySetInnerHTML={{
          __html: `<p>Hello <em>dear</em> world!</p><ul><li>One</li><li>Two</li></ul>`,
        }}
      />
    );

    expect(
      saturate(
        <div className="yup" onClick={handler}>
          <p>
            Hello <em onClick={handler}>dear</em> world!
          </p>
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
        </div>,
        {}
      )
    ).toEqual(
      <div className="yup" onClick={handler}>
        <p>
          Hello{' '}
          <em
            onClick={handler}
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: 'dear' }}
          />{' '}
          world!
        </p>
        <ul
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: '<li>One</li><li>Two</li>' }}
        />
      </div>
    );

    expect(
      saturate(
        <div className="yup" onClick={handler}>
          <p>
            Hello <em data-what="ok">dear</em> world!
          </p>
          <ul>
            <li onClick={handler}>One</li>
            <li>Two</li>
          </ul>
        </div>,
        {}
      )
    ).toEqual(
      <div className="yup" onClick={handler}>
        <p
          data-saturated={true}
          dangerouslySetInnerHTML={{
            __html: `Hello <em data-what="ok">dear</em> world!`,
          }}
        />
        <ul>
          <li
            onClick={handler}
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: 'One' }}
          />
          <li
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: 'Two' }}
          />
        </ul>
      </div>
    );
  });

  it('Compiles away dumb components', () => {
    const Comp1 = ({ name }: { name: string }) => {
      return (
        <div>
          So long, <em>farewell</em>, <strong>{name}</strong>!
        </div>
      );
    };

    expect(
      saturate(
        <div>
          <h1>People</h1>
          <ul>
            {['Jack', 'Jane'].map(name => (
              <li key={name}>
                <Comp1 key={name} name={name} />
              </li>
            ))}
          </ul>
        </div>,
        {}
      )
    ).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{
          __html: `<h1>People</h1><ul><li><div>So long, <em>farewell</em>, <strong>Jack</strong>!</div></li><li><div>So long, <em>farewell</em>, <strong>Jane</strong>!</div></li></ul>`,
        }}
      />
    );
  });

  it('Compiles away components that uses knownClientRefs', () => {
    const Comp1 = ({ name }: { name: string }) => {
      return (
        <div>
          So long, <em onClick={handler}>farewell</em>, <strong>{name}</strong>!
        </div>
      );
    };

    let found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <ul>
            {['Jack', 'Jane'].map(name => (
              <li key={name}>
                <Comp1 name={name} />
              </li>
            ))}
          </ul>
        </div>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <ul>
          <li>
            <Comp1 name={'Jack'} />
          </li>
          <li>
            <Comp1 name={'Jane'} />
          </li>
        </ul>
      </div>
    );
    expect(found).toEqual(new Set([Comp1]));

    found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <ul>
            {['Jack', 'Jane'].map(name => (
              <li key={name}>
                <Comp1 name={name} />
              </li>
            ))}
          </ul>
        </div>,
        {
          knownClientRefs: new Set([handler]),
        }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <ul>
          <li>
            <div>
              So long,{' '}
              <em
                onClick={handler}
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'farewell' }}
              />
              ,{' '}
              <strong
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'Jack' }}
              />
              !
            </div>
          </li>
          <li>
            <div>
              So long,{' '}
              <em
                onClick={handler}
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'farewell' }}
              />
              ,{' '}
              <strong
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'Jane' }}
              />
              !
            </div>
          </li>
        </ul>
      </div>
    );
    expect(found).toEqual(new Set());
  });

  it('Compiles away components with slots, even if slot content has event handlers', () => {
    const Comp1 = ({
      name,
      children,
    }: {
      name?: React.ReactNode;
      children?: React.ReactNode;
    }) => {
      return (
        <div>
          So long, <em>{children}</em>, <strong>{name}</strong>!
        </div>
      );
    };

    let found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <Comp1 name={<span className="good">Jack</span>}>
            <span>this is my greeting</span>
          </Comp1>
        </div>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{
          __html: `<h1>People</h1><div>So long, <em><span>this is my greeting</span></em>, <strong><span class="good">Jack</span></strong>!</div>`,
        }}
      />
    );
    expect(found).toEqual(new Set());

    found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <Comp1 name={<span className="good">Jack</span>}>
            <span onClick={handler}>my greeting</span>
          </Comp1>
        </div>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <div>
          So long,{' '}
          <em>
            <span
              onClick={handler}
              data-saturated={true}
              dangerouslySetInnerHTML={{ __html: 'my greeting' }}
            />
          </em>
          ,{' '}
          <strong
            data-saturated={true}
            dangerouslySetInnerHTML={{
              __html: `<span class="good">Jack</span>`,
            }}
          />
          !
        </div>
      </div>
    );
    expect(found).toEqual(new Set());

    found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <Comp1
            name={
              <span onClick={handler} className="good">
                Jack
              </span>
            }
          >
            <span>my greeting</span>
          </Comp1>
        </div>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <div>
          So long,{' '}
          <em
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: `<span>my greeting</span>` }}
          />
          ,{' '}
          <strong>
            <span
              data-saturated={true}
              onClick={handler}
              className="good"
              dangerouslySetInnerHTML={{ __html: 'Jack' }}
            />
          </strong>
          !
        </div>
      </div>
    );
    expect(found).toEqual(new Set());
  });

  it('Will not compile away components that attach event handlers', () => {
    const Comp1 = ({
      children,
      msg,
    }: {
      children?: React.ReactNode;
      msg: string;
    }) => {
      return (
        <div>
          So long, <em onClick={() => alert(`Clicked ${msg}`)}>{children}</em>!
        </div>
      );
    };

    const Comp2 = ({ children }: { children?: React.ReactNode }) => {
      return <section>{children}</section>;
    };

    let found = new Set<any>();
    expect(
      saturate(
        <div>
          <h1>People</h1>
          <Comp1 msg="oops">
            <span>my greeting</span>
          </Comp1>
        </div>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <Comp1 msg="oops">
          <span
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: 'my greeting' }}
          />
        </Comp1>
      </div>
    );
    expect(found).toEqual(new Set([Comp1]));

    found = new Set<any>();
    expect(
      saturate(
        <Comp2>
          <Comp1 msg="ok">
            <div>
              I do not <em>think so</em>
            </div>
          </Comp1>
        </Comp2>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <section>
        <Comp1 msg="ok">
          <div
            data-saturated={true}
            dangerouslySetInnerHTML={{ __html: 'I do not <em>think so</em>' }}
          />
        </Comp1>
      </section>
    );
    expect(found).toEqual(new Set([Comp1]));
  });

  it('Skips components that use hooks', () => {
    const found = new Set<any>();
    const Comp1 = ({ children }: { children?: React.ReactNode }) => {
      const [blah, _] = React.useState(false);
      return (
        <div>
          So long, <em>{children}</em> and {blah}!
        </div>
      );
    };

    expect(
      saturate(
        <div>
          <h1>People</h1>
          <Comp1>
            <span>
              delicious <strong>cake</strong>
            </span>
          </Comp1>
        </div>,
        {
          detectedClientComponents: found,
        }
      )
    ).toEqual(
      <div>
        <h1
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'People' }}
        />
        <Comp1>
          <span
            data-saturated={true}
            dangerouslySetInnerHTML={{
              __html: 'delicious <strong>cake</strong>',
            }}
          />
        </Comp1>
      </div>
    );

    expect(found).toEqual(new Set([Comp1]));
  });

  it("If client component takes non-serializable props, but doesn't use it and is inlineable, then parent is also inlineable", () => {
    const Parent = () => {
      return (
        <div>
          <Child greet={() => alert('hi')} />
        </div>
      );
    };

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const Child = ({ greet }: any) => {
      return <span>Oh hai</span>;
    };

    expect(saturate(<Parent />, {})).toEqual(
      <div
        data-saturated={true}
        dangerouslySetInnerHTML={{ __html: '<span>Oh hai</span>' }}
      />
    );
  });

  it('If client component takes non-serializable props, but cannot be inlined, then parent cannot be inlined', () => {
    const Parent = () => {
      return (
        <div>
          <Child greet={() => alert('hi')} />
        </div>
      );
    };

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const Child = ({ greet }: any) => {
      return <span onClick={() => alert('yup')}>Oh hai</span>;
    };

    expect(saturate(<Parent />, {})).toEqual(<Parent />);
  });

  it('Does not compile away components that attach refs', () => {
    const found = new Set<any>();
    const Comp1 = ({ children }: { children?: React.ReactNode }) => {
      return <div ref={(x: any) => console.log('Got', x)}>{children}</div>;
    };

    expect(
      saturate(
        <Comp1>
          Hello <em>there</em> you
        </Comp1>,
        { detectedClientComponents: found }
      )
    ).toEqual(
      <Comp1>
        Hello{' '}
        <em
          data-saturated={true}
          dangerouslySetInnerHTML={{ __html: 'there' }}
        />{' '}
        you
      </Comp1>
    );

    expect(found).toEqual(new Set([Comp1]));
  });

  describe('Blog post examples', () => {
    const pokemons = [
      {
        slug: 'pikachu',
        name: 'Pikachu',
        types: ['Electric'],
      },
      {
        slug: 'bulbasaur',
        name: 'Bulbasaur',
        types: ['Grass', 'Poison'],
      },
    ];

    it('Works with flattening static content', () => {
      const Page = ({ pokemons }: any) => {
        return (
          <div>
            {pokemons.map((pokemon: any) => (
              <PokemonCard pokemon={pokemon} />
            ))}
          </div>
        );
      };
      const PokemonCard = ({ pokemon }: any) => {
        return (
          <div className="card">
            <div className="title">{pokemon.name}</div>
            <div>
              {pokemon.types.map((t: any) => (
                <Chip text={t} />
              ))}
            </div>
          </div>
        );
      };
      const Chip = ({ text }: any) => {
        return <span className="chip">{text}</span>;
      };

      expect(saturate(<Page pokemons={pokemons} />, {})).toEqual(
        <div
          data-saturated={true}
          dangerouslySetInnerHTML={{
            __html: `<div class="card"><div class="title">Pikachu</div><div><span class="chip">Electric</span></div></div><div class="card"><div class="title">Bulbasaur</div><div><span class="chip">Grass</span><span class="chip">Poison</span></div></div>`,
          }}
        />
      );
    });

    it('Works with client-only Link components', () => {
      const Page = ({ pokemons }: any) => {
        return (
          <div>
            {pokemons.map((pokemon: any) => (
              <PokemonCard pokemon={pokemon} />
            ))}
          </div>
        );
      };
      const PokemonCard = ({ pokemon }: any) => {
        return (
          <div className="card">
            <div className="title">{pokemon.name}</div>
            <div>
              {pokemon.types.map((t: any) => (
                <Chip text={t} />
              ))}
            </div>
            <Link href={`/p/${pokemon.slug}`}>
              <a>Read more</a>
            </Link>
          </div>
        );
      };
      const Link = ({ children }: any) => {
        return children;
      };
      const Chip = ({ text }: any) => {
        return <span className="chip">{text}</span>;
      };

      expect(
        saturate(<Page pokemons={pokemons} />, {
          knownClientRefs: new Set([Link]),
        })
      ).toEqual(
        <div>
          <div className="card">
            <div
              data-saturated={true}
              className="title"
              dangerouslySetInnerHTML={{ __html: `Pikachu` }}
            />
            <div
              data-saturated={true}
              dangerouslySetInnerHTML={{
                __html: `<span class="chip">Electric</span>`,
              }}
            />
            <Link href={`/p/pikachu`}>
              <a
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'Read more' }}
              />
            </Link>
          </div>
          <div className="card">
            <div
              data-saturated={true}
              className="title"
              dangerouslySetInnerHTML={{ __html: `Bulbasaur` }}
            />
            <div
              data-saturated={true}
              dangerouslySetInnerHTML={{
                __html: `<span class="chip">Grass</span><span class="chip">Poison</span>`,
              }}
            />
            <Link href={`/p/bulbasaur`}>
              <a
                data-saturated={true}
                dangerouslySetInnerHTML={{ __html: 'Read more' }}
              />
            </Link>
          </div>
        </div>
      );
    });

    it('Works with UppercaseChip example', () => {
      function UppercaseChip({ text }: any) {
        return (
          <Chip text={text} transformer={(t: string) => t.toUpperCase()} />
        );
      }

      function Chip({ text, transformer }: any) {
        return <span className="chip">{transformer(text)}</span>;
      }

      expect(saturate(<UppercaseChip text="hello" />, {})).toEqual(
        <span
          data-saturated={true}
          className="chip"
          dangerouslySetInnerHTML={{ __html: 'HELLO' }}
        />
      );
    });
  });
});
